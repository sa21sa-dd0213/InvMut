import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - kill md7122d6c", function () {
  it("should revert when purchasing quantity less than daily allowance with inverted comparison operator", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, addr1.address);
    await gameItems.waitForDeployment();
    
    // Deploy Neuron contract
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(
      owner.address,
      addr1.address,
      addr2.address
    );
    await neuron.waitForDeployment();
    
    // Set up the Neuron contract reference in GameItems
    await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());
    
    // Create a game item with dailyAllowance of 5
    await gameItems.connect(owner).createGameItem(
      "Test Item",
      "https://test.uri/",
      false,  // finiteSupply = false (unlimited supply)
      true,   // transferable
      0,      // itemsRemaining (irrelevant for unlimited supply)
      ethers.parseEther("1"),  // itemPrice = 1 NRN
      5       // dailyAllowance = 5
    );
    
    // Give addr2 some NRN tokens
    const treasuryAddress = addr1.address;
    await neuron.connect(owner).mint(addr2.address, ethers.parseEther("100"));
    
    // Approve GameItems to spend NRN on behalf of addr2
    await neuron.connect(owner).addSpender(await gameItems.getAddress());
    await neuron.connect(addr2).approve(await gameItems.getAddress(), ethers.parseEther("100"));
    
    // Attempt to buy 1 item (less than daily allowance of 5)
    // Original: should succeed
    // Mutant: should revert because 1 >= 5 is false
    await expect(
      gameItems.connect(addr2).mint(0, 1)
    ).to.be.reverted;
  });
});