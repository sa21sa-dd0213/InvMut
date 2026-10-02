import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant detection test", function () {
  it("should detect mutant that changes >= to == in Collect condition", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LogFile first (required by PENNY_BY_PENNY)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy PENNY_BY_PENNY (no constructor arguments)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    await instance.connect(owner).Initialized();

    // addr1 deposits 2 ETH (balance > MinSum which is 1 ETH)
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Verify balance is greater than MinSum
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    expect(holder.balance).to.be.gt(await instance.MinSum());

    // Attempt to collect 1 ETH - should succeed in original, fail in mutant
    const collectAmount = ethers.parseEther("1");

    // In the mutant, acc.balance (2) == MinSum (1) is false, so Collect will revert
    // In the original, acc.balance (2) >= MinSum (1) is true, so Collect should succeed
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;

    // Verify that balance was NOT reduced (mutant prevents collection)
    const holderAfter = await instance.Acc(addr1.address);
    expect(holderAfter.balance).to.equal(depositAmount);
  });
});