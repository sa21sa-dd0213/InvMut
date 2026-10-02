import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - daily allowance replenish time", function () {
  it("should kill mutant m7f876532 by verifying daily allowance replenishment uses block.timestamp", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy GameItems with required constructor arguments
    const treasuryAddress = user.address;
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, treasuryAddress);
    await gameItems.waitForDeployment();

    // Set user as admin to create game items
    await gameItems.adjustAdminAccess(owner.address, true);

    // Create a game item with daily allowance of 10, price 0 for simplicity
    // We need to deploy Neuron contract for the mint function to work
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, treasuryAddress, owner.address);
    await neuron.waitForDeployment();

    // Instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());

    // Create game item with daily allowance
    const dailyAllowance = 10;
    await gameItems.createGameItem(
      "Test Item",
      "ipfs://test",
      false,  // infinite supply
      true,   // transferable
      0,      // itemsRemaining (unused for infinite)
      0,      // itemPrice (free)
      dailyAllowance
    );

    const tokenId = 0;

    // Get the current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // Mint one item to trigger allowance replenishment
    // First give user some NRN tokens
    await neuron.transfer(user.address, ethers.parseEther("100"));

    // User needs approval for the transfer
    await neuron.connect(user).approve(await gameItems.getAddress(), ethers.parseEther("100"));

    // Mint the item (price is 0 so this should work)
    await gameItems.connect(user).mint(tokenId, 1);

    // Check that dailyAllowanceReplenishTime is set to current timestamp + 1 day
    // We need to access the mapping - use a helper function or direct storage access
    // Since dailyAllowanceReplenishTime is public, we can read it
    const replenishTime = await gameItems.dailyAllowanceReplenishTime(user.address, tokenId);

    // The replenish time should be exactly current timestamp + 86400 seconds (1 day)
    // With the mutant, it would be block.prevrandao + 86400 which is unpredictable and likely different
    const expectedTime = currentTimestamp + 86400;

    // Check that the replenish time matches expected block.timestamp-based calculation
    expect(replenishTime).to.equal(expectedTime);

    // Also verify that allowance remaining is correctly set
    const allowance = await gameItems.getAllowanceRemaining(user.address, tokenId);
    expect(allowance).to.equal(dailyAllowance);

    // Fast forward time past the replenish time
    await ethers.provider.send("evm_setNextBlockTimestamp", [expectedTime + 1]);
    await ethers.provider.send("evm_mine", []);

    // After time passes, allowance should be replenished to dailyAllowance
    const replenishedAllowance = await gameItems.getAllowanceRemaining(user.address, tokenId);
    expect(replenishedAllowance).to.equal(dailyAllowance);
  });
});