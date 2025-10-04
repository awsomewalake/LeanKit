import * as React from "react";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import StarOutlinedIcon from "@mui/icons-material/StarOutlined";
import {
  Box,
  IconButton,
  TextField,
  ListItemButton,
  Button,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import boardApi from "../api/boardApi";
import authApi from "../api/authApi";
import EmojiPicker from "../components/common/EmojiPicker";
import Kanban from "../components/common/Kanban";
import { setSharedBoards } from "../redux/features/sharedSlice";
import { setFavouriteList } from "../redux/features/favouriteSlice";
import Modal from "@mui/material/Modal";
import Typography from "@mui/material/Typography";
import SearchAppBar from "../components/common/Search";

import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
let timer;
const timeout = 500;

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};
const Shared = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { boardId } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState([]);
  const [isFavourite, setIsFavourite] = useState(false);
  const [icon, setIcon] = useState("");
  const boards = useSelector((state) => state.sharedBoard.value);
  const favouriteList = useSelector((state) => state.favourites.value);
  const [userids, setUserIds] = useState([]);
  const [open, setOpen] = React.useState(false);

  const getUsers = async () => {
    const res = await authApi.getAllUsers();
    const allusers = res.allusers;
    // console.log("all users",allusers)
    let usernames = [];
    // let user = []
    allusers.forEach((e) => {
      usernames.push({"username":e.username,"id":e._id});
    });
    // console.log(usernames)
    setUserIds(usernames);
  };

  const handleOpen = () => {
    setOpen(true);
    getUsers();
  };
  const handleClose = () => setOpen(false);

  useEffect(() => {
    const getBoard = async () => {
      try {
        const res = await boardApi.getOneShared(boardId);
        setTitle(res.title);
        setDescription(res.description);
        setSections(res.sections);
        setIsFavourite(res.favourite);
        setIcon(res.icon);
      } catch (err) {
        alert(err);
      }
    };
    getBoard();
  }, [boardId]);

  const onIconChange = async (newIcon) => {
    let temp = [...boards];
    const index = temp.findIndex((e) => e.id === boardId);
    temp[index] = { ...temp[index], icon: newIcon };

    if (isFavourite) {
      let tempFavourite = [...favouriteList];
      const favouriteIndex = tempFavourite.findIndex((e) => e.id === boardId);
      tempFavourite[favouriteIndex] = {
        ...tempFavourite[favouriteIndex],
        icon: newIcon,
      };
      dispatch(setFavouriteList(tempFavourite));
    }

    setIcon(newIcon);
    dispatch(setSharedBoards(temp));
    try {
      await boardApi.updateShared(boardId, { icon: newIcon });
    } catch (err) {
      alert(err);
    }
  };

  const updateTitle = async (e) => {
    clearTimeout(timer);
    const newTitle = e.target.value;
    setTitle(newTitle);

    let temp = [...boards];
    const index = temp.findIndex((e) => e.id === boardId);
    temp[index] = { ...temp[index], title: newTitle };

    if (isFavourite) {
      let tempFavourite = [...favouriteList];
      const favouriteIndex = tempFavourite.findIndex((e) => e.id === boardId);
      tempFavourite[favouriteIndex] = {
        ...tempFavourite[favouriteIndex],
        title: newTitle,
      };
      dispatch(setFavouriteList(tempFavourite));
    }

    dispatch(setSharedBoards(temp));

    timer = setTimeout(async () => {
      try {
        await boardApi.updateShared(boardId, { title: newTitle });
      } catch (err) {
        alert(err);
      }
    }, timeout);
  };

  const searchUser = async (e) => {
    clearTimeout(timer);
    const user = e.target.value;
  };

  const updateDescription = async (e) => {
    clearTimeout(timer);
    const newDescription = e.target.value;
    setDescription(newDescription);
    timer = setTimeout(async () => {
      try {
        await boardApi.updateShared(boardId, { description: newDescription });
      } catch (err) {
        alert(err);
      }
    }, timeout);
  };

  const addFavourite = async () => {
    try {
      const board = await boardApi.updateShared(boardId, {
        favourite: !isFavourite,
      });
      let newFavouriteList = [...favouriteList];
      if (isFavourite) {
        newFavouriteList = newFavouriteList.filter((e) => e.id !== boardId);
      } else {
        newFavouriteList.unshift(board);
      }
      dispatch(setFavouriteList(newFavouriteList));
      setIsFavourite(!isFavourite);
    } catch (err) {
      alert(err);
    }
  };

  const deleteBoard = async () => {
    try {
      await boardApi.deleteShared(boardId);
      if (isFavourite) {
        const newFavouriteList = favouriteList.filter((e) => e.id !== boardId);
        dispatch(setFavouriteList(newFavouriteList));
      }

      const newList = boards.filter((e) => e.id !== boardId);
      if (newList.length === 0) {
        navigate("/shared");
      } else {
        navigate(`/shared/${newList[0].id}`);
      }
      dispatch(setSharedBoards(newList));
    } catch (err) {
      alert(err);
    }
  };
  const addUser = async(userId,boardId)=>{
    // console.log(userId,boardId);
    try{
      await boardApi.addSharedUser(boardId,{name:userId});
    }catch(err){
      alert(err);
    }
  }


  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        {/* <IconButton variant="outlined" onClick={addFavourite}>
          {isFavourite ? (
            <StarOutlinedIcon color="warning" />
          ) : (
            <StarBorderOutlinedIcon />
          )}
        </IconButton> */}
        <Button variant="contained" onClick={handleOpen}>
          Add Users
        </Button>
        <IconButton variant="outlined" color="error" onClick={deleteBoard}>
          <DeleteOutlinedIcon />
        </IconButton>
      </Box>
      <Box sx={{ padding: "10px 50px" }}>
        <Box>
          {/* emoji picker */}
          <EmojiPicker icon={icon} onChange={onIconChange} />
          <TextField
            value={title}
            onChange={updateTitle}
            placeholder="Untitled"
            variant="outlined"
            fullWidth
            sx={{
              "& .MuiOutlinedInput-input": { padding: 0 },
              "& .MuiOutlinedInput-notchedOutline": { border: "unset " },
              "& .MuiOutlinedInput-root": {
                fontSize: "2rem",
                fontWeight: "700",
              },
            }}
          />
          <TextField
            value={description}
            onChange={updateDescription}
            placeholder="Add a description"
            variant="outlined"
            multiline
            fullWidth
            sx={{
              "& .MuiOutlinedInput-input": { padding: 0 },
              "& .MuiOutlinedInput-notchedOutline": { border: "unset " },
              "& .MuiOutlinedInput-root": { fontSize: "0.8rem" },
            }}
          />
        </Box>
        <Box>
          {/* Kanban board */}
          <Kanban data={sections} boardId={boardId} />
        </Box>
        <Box>
          <div>
            <Modal
              open={open}
              onClose={handleClose}
              aria-labelledby="modal-modal-title"
              aria-describedby="modal-modal-description"
            >
              <Box sx={style}>
                {userids.map((item) => (
                  
                    <ListItemButton key={item.id}>
                      <Typography
                        variant="body2"
                        fontWeight="700"
                        sx={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.username}
                      </Typography>
                      <IconButton
                        onClick={()=>addUser(item.id,boardId)}
                        variant="outlined"
                        size="small"
                        sx={{
                          color: "gray",
                          "&:hover": { color: "green" },
                        }}
                      >
                        <AddOutlinedIcon />
                      </IconButton>
                    </ListItemButton>
                  
                ))}
              </Box>
            </Modal>
          </div>
        </Box>
      </Box>
    </>
  );
};

export default Shared;
