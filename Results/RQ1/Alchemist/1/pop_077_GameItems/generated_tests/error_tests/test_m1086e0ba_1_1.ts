import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant m1086e0ba test", function () {
  it("should kill the mutant by calling mint when dailyAllowanceReplenishTime equals block.timestamp", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy Neuron contract first (required for GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, addr1.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems with required constructor arguments
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Setup: instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Create a game item with daily allowance
    const dailyAllowance = 100;
    const itemPrice = ethers.parseEther("1");
    await gameItems.createGameItem(
      "Test Item",
      "ipfs://test",
      false,  // not finite supply
      true,   // transferable
      0,      // itemsRemaining (not used since finiteSupply is false)
      itemPrice,
      dailyAllowance
    );
    
    // Give addr1 enough NRN to purchase
    const purchaseQuantity = 5;
    const totalPrice = itemPrice * BigInt(purchaseQuantity);
    await neuron.connect(owner).transfer(addr1.address, totalPrice);
    
    // Approve GameItems to spend addr1's NRN
    await neuron.connect(addr1).approve(await gameItems.getAddress(), totalPrice);
    
    // First purchase to set up daily allowance replenish time
    const tokenId = 0;
    await gameItems.connect(addr1).mint(tokenId, purchaseQuantity);
    
    // Get the current replenish time
    const replenishTime = await gameItems.dailyAllowanceReplenishTime(addr1.address, tokenId);
    
    // Fast forward to exactly the replenish time
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(replenishTime)]);
    
    // This should replenish the allowance in the original (<=) but NOT in the mutant (<)
    // The mutant uses < instead of <=, so at exactly block.timestamp == replenishTime,
    // the mutant will NOT replenish the allowance, causing the subsequent subtraction to fail
    await gameItems.connect(addr1).mint(tokenId, purchaseQuantity);
    
    // Verify the allowance was replenished (original behavior)
    const allowanceAfter = await gameItems.allowanceRemaining(addr1.address, tokenId);
    expect(allowanceAfter).to.equal(dailyAllowance - BigInt(purchaseQuantity));
  });
});