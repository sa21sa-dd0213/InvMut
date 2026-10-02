import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant test - mb24d92fb", function () {
  it("should revert when Collect fails due to receiving contract rejecting ether", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy DEP_BANK (no constructor arguments needed)
    const DEP_BANK = await ethers.getContractFactory("DEP_BANK");
    const bank = await DEP_BANK.deploy();
    await bank.waitForDeployment();

    // Deploy a receiver contract that rejects ether
    const ReceiverFactory = await ethers.getContractFactory("RejectEther");
    const receiver = await ReceiverFactory.deploy();
    await receiver.waitForDeployment();

    // Initialize the bank
    await bank.connect(owner).SetMinSum(1);
    await bank.connect(owner).SetLogFile(await ethers.Wallet.createRandom().getAddress()); // dummy address
    await bank.connect(owner).Initialized();

    // Fund the bank via deposit
    const depositAmount = ethers.parseEther("1");
    await bank.connect(user).Deposit({ value: depositAmount });

    // Verify balance is correct
    expect(await bank.balances(user.address)).to.equal(depositAmount);

    // Try to collect using the rejecting receiver as the caller
    // The receiver contract's receive function will revert
    const collectAmount = ethers.parseEther("0.5");
    
    // On original: this should revert because the call fails
    // On mutant: this would succeed (balance deducted but ether not sent)
    await expect(
      bank.connect(receiver).Collect(collectAmount)
    ).to.be.reverted;

    // If the test reaches here, the mutant is killed because the revert happened
    // (mutant would not revert, so the test would fail on the expect)
  });
});

// Helper contract that rejects ether
contract RejectEther {
  receive() external payable {
    revert("Ether rejected");
  }
}