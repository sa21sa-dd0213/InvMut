import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant m45f95f12 - daily allowance replenishment boundary test", function () {
  it("should allow purchase when dailyAllowanceReplenishTime equals block.timestamp (original <= vs mutant <)", async function () {
    const [owner, addr1, treasury] = await ethers.getSigners();
    
    // Deploy Neuron contract first (needed for minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, treasury.address, addr1.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, treasury.address);
    await gameItems.waitForDeployment();
    
    // Setup: instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Owner creates a game item with daily allowance
    await gameItems.createGameItem(
      "Test Item",
      "ipfs://test",
      true,    // finiteSupply
      true,    // transferable
      1000,    // itemsRemaining
      ethers.parseEther("1"),    // itemPrice
      10       // dailyAllowance
    );
    
    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTimestamp = block!.timestamp;
    
    // Give addr1 some NRN tokens
    await neuron.mint(addr1.address, ethers.parseEther("100"));
    
    // First purchase to set up daily allowance replenishment time
    await gameItems.connect(addr1).mint(0, 1);
    
    // Get the dailyAllowanceReplenishTime that was set
    const replenishTime = await gameItems.dailyAllowanceReplenishTime(addr1.address, 0);
    
    // Advance time to exactly when replenishTime equals block.timestamp
    // We need to mine a block at exactly that timestamp
    const targetTime = Number(replenishTime);
    await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
    await ethers.provider.send("evm_mine", []);
    
    // Now dailyAllowanceReplenishTime[addr1][0] should equal block.timestamp
    // In original: condition is <= so allowance will be replenished
    // In mutant: condition is < so allowance will NOT be replenished
    
    // Try to purchase - should succeed in original, fail in mutant
    // If we can purchase, the original code is working (allowance was replenished)
    // If we cannot purchase, the mutant code is active (allowance was NOT replenished)
    const tx = gameItems.connect(addr1).mint(0, 5);
    
    // The transaction should succeed in the original contract
    await expect(tx).to.not.be.reverted;
    
    // Verify the purchase went through by checking balance
    const balance = await gameItems.balanceOf(addr1.address, 0);
    // We already had 1 from first purchase, plus 5 from this one = 6
    expect(balance).to.equal(6);
  });
});