import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test m6a84e5aa", function () {
  it("should detect mutant that replaces && with || in Collect function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: initialize the contract and set MinSum
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    await instance.connect(owner).Initialized();

    // Setup: create a Log contract so Put/Collect work
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());

    // addr1 puts 2 ETH with a long lock time (future unlock)
    const lockTime = 1000000; // far in the future
    await instance.connect(addr1).Put(lockTime, { value: ethers.parseEther("2") });

    // addr1 tries to collect 3 ETH (more than balance) - should fail in original
    // but mutant allows because acc.balance >= MinSum (2 >= 1) is true with ||
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("3"))
    ).to.be.reverted; // original would revert; mutant would succeed
  });
});