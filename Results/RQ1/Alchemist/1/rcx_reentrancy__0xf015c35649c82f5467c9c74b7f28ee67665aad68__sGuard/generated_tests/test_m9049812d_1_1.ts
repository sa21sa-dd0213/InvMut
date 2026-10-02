import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - Collect function", function () {
  it("should revert when Collect is called and the recipient contract reverts the ether transfer", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy a Log contract (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with the Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(log.target);
    await bank.waitForDeployment();

    // Deploy a malicious contract that reverts on receive
    const ReverterFactory = await ethers.getContractFactory(
      "contract Reverter { receive() external payable { revert(); } }"
    );
    const reverter = await ReverterFactory.deploy();
    await reverter.waitForDeployment();

    // Fund the reverter contract so it can call Put
    await owner.sendTransaction({
      to: reverter.target,
      value: ethers.parseEther("10")
    });

    // Call Put from the reverter to deposit funds (with unlock time in the past)
    const currentBlock = await ethers.provider.getBlock("latest");
    const pastTime = currentBlock.timestamp - 1000;
    await bank.connect(reverter).Put(pastTime, { value: ethers.parseEther("5") });

    // Ensure MinSum condition is met (MinSum = 1 ether, we deposited 5)
    // Attempt to Collect 1 ether - this should revert on the original contract
    // because the call to the reverter will fail
    await expect(
      bank.connect(reverter).Collect(ethers.parseEther("1"))
    ).to.be.reverted;

    // If the test passes (reverts), it means the call failed and balance wasn't deducted
    // The mutant would incorrectly succeed (no revert) because it ignores the call result
  });
});