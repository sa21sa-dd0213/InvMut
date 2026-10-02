import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant mbfc3848d test", function () {
  it("should revert when CashOut is called and the external call fails (mutant always succeeds)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with the Log contract address
    const BankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deploy a malicious contract that reverts on receiving ether
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();

    // Fund the bank with ether for the test
    await owner.sendTransaction({
      to: await bank.getAddress(),
      value: ethers.parseEther("10")
    });

    // Deposit from addr1 to get balance
    await bank.connect(addr1).Deposit({
      value: ethers.parseEther("2")
    });

    // Try to cash out to the malicious contract that reverts
    // In original contract this should revert, in mutant it should succeed
    await expect(
      bank.connect(addr1).CashOut(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});

// Helper contract that rejects incoming ether
contract MaliciousReceiver {
  receive() external payable {
    revert("I don't accept ether");
  }
}