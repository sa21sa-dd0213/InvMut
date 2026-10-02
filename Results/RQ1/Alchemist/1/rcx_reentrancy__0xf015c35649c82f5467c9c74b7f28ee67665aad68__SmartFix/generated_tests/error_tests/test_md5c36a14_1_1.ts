import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - md5c36a14", function () {
  it("should revert when Collect external call fails (mutant removed revert)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (needed for MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deploy a contract that rejects Ether to trigger failed external call
    const RejectorFactory = await ethers.getContractFactory("Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Fund user with ether
    await owner.sendTransaction({
      to: user.address,
      value: ethers.parseEther("5")
    });

    // User puts 2 ether into bank
    await bank.connect(user).Put(ethers.parseEther("0"), { value: ethers.parseEther("2") });

    // Verify user has balance
    const holderBefore = await bank.Acc(user.address);
    expect(holderBefore.balance).to.equal(ethers.parseEther("2"));

    // User tries to collect 1 ether to the rejector contract (which will fail)
    // In original contract this would revert, in mutant it would not
    await expect(
      bank.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;

    // Verify balance remains unchanged after failed collect
    const holderAfter = await bank.Acc(user.address);
    expect(holderAfter.balance).to.equal(ethers.parseEther("2"));
  });
});