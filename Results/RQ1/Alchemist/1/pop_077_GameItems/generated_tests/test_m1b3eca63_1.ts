import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - Kill mutant m1b3eca63 (balance check >= vs ==)", function () {
  it("should allow minting when user has more NRN than the item price, but mutant should revert", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Neuron contract
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, owner.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems contract
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Setup: create a game item with price = 100 NRN
    const itemPrice = ethers.parseEther("100");
    const dailyAllowance = 100;
    await gameItems.createGameItem(
      "TestItem",
      "ipfs://test",
      false,  // not finite supply
      true,   // transferable
      0,      // itemsRemaining (not used)
      itemPrice,
      dailyAllowance
    );
    
    // Setup: instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Setup: mint 150 NRN to user (more than the 100 price)
    const userBalance = ethers.parseEther("150");
    await neuron.mint(user.address, userBalance);
    
    // Setup: give GameItems contract ability to spend user's NRN
    const minterRole = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const spenderRole = ethers.keccak256(ethers.toUtf8Bytes("SPENDER_ROLE"));
    await neuron.addMinter(owner.address);
    await neuron.addSpender(owner.address);
    
    // User approves GameItems to spend NRN via the approveSpender mechanism
    await neuron.connect(user).approve(await gameItems.getAddress(), userBalance);
    
    // Setup: set daily allowance replenish time to past so user can mint
    // User mints 1 item costing 100 NRN, should succeed on original but fail on mutant
    const tokenId = 0;
    const quantity = 1;
    
    // On original contract (with >=), this should succeed
    // On mutant (with ==), this should revert because 150 != 100
    const tx = gameItems.connect(user).mint(tokenId, quantity);
    
    // The test expects the transaction to succeed (original behavior)
    // but the mutant will fail because balance (150) != price (100)
    await expect(tx).to.not.be.reverted;
    
    // Verify the user received the item
    expect(await gameItems.balanceOf(user.address, tokenId)).to.equal(quantity);
  });
});