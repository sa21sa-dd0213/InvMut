import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant m45970f89 test", function () {
  it("should allow minting when quantity equals remaining daily allowance (kills mutant with strict <)", async function () {
    const [owner, buyer] = await ethers.getSigners();
    
    // Deploy Neuron contract first (required by GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, owner.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems with required constructor args
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Set up Neuron contract reference in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Create a game item with dailyAllowance = 100
    await gameItems.createGameItem(
      "Test Item",
      "https://test.uri",
      false,  // finiteSupply = false
      true,   // transferable = true
      0,      // itemsRemaining (irrelevant since finiteSupply is false)
      ethers.parseEther("1"),  // itemPrice = 1 NRN
      100     // dailyAllowance = 100
    );
    
    // Give buyer enough NRN tokens
    await neuron.transfer(buyer.address, ethers.parseEther("100"));
    
    // Get the daily allowance (should be 100)
    const dailyAllowance = 100;
    
    // Set the daily allowance replenish time to past so allowance is available
    // First, trigger replenishment by making a small purchase to initialize
    // But we need to set allowance manually via the replenish mechanism
    
    // Fast forward time to ensure allowance replenishment is triggered
    await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
    await ethers.provider.send("evm_mine", []);
    
    // Now make a small purchase to trigger replenishment
    await neuron.connect(buyer).approve(await gameItems.getAddress(), ethers.parseEther("1"));
    await gameItems.connect(buyer).mint(0, 1);
    
    // After replenishment, allowanceRemaining should be 100
    // Now try to mint with quantity equal to remaining allowance (100)
    // This should succeed on original (<=) but fail on mutant (<)
    
    // Get the remaining allowance after the first mint
    const remainingAfterFirstMint = await gameItems.getAllowanceRemaining(buyer.address, 0);
    
    // The first mint of 1 item should have consumed 1 from the daily allowance
    // So remaining should be 99, but we'll use that remaining amount
    // To test the boundary condition, let's mint exactly the remaining amount
    await neuron.connect(buyer).approve(
      await gameItems.getAddress(), 
      ethers.parseEther(remainingAfterFirstMint.toString())
    );
    
    // This should succeed on original (quantity <= allowance) 
    // but fail on mutant (quantity < allowance) since quantity == allowance
    const tx = gameItems.connect(buyer).mint(0, Number(remainingAfterFirstMint));
    
    // The mutant would revert because it uses < instead of <=
    // So we expect this transaction to succeed on the original
    // and fail on the mutant
    await expect(tx).to.not.be.reverted;
    
    // Verify the balance increased by the expected amount
    const balance = await gameItems.balanceOf(buyer.address, 0);
    expect(balance).to.equal(BigInt(Number(remainingAfterFirstMint) + 1));
  });
});