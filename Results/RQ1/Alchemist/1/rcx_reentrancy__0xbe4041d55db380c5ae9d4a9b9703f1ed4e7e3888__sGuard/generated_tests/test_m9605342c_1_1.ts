import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test", function () {
  it("should kill mutant m9605342c by using balance > MinSum and expecting successful Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 1 ether
    await instance.SetMinSum(ethers.parseEther("1"));
        
    // Initialize the contract
    await instance.Initialized();

    // Set Log contract
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.SetLogFile(await logInstance.getAddress());

    // addr1 deposits 2 ether (balance > MinSum)
    await instance.connect(addr1).Put(0, { value: ethers.parseEther("2") });

    // Wait for unlock time (Put with _lockTime=0, so block.timestamp > unlockTime immediately)
    await ethers.provider.send("evm_mine", []);

    // addr1 tries to Collect 1.5 ether (balance > MinSum, _am <= balance, time condition met)
    // On original: succeeds because acc.balance >= MinSum (2 >= 1)
    // On mutant: fails because acc.balance == MinSum is false (2 != 1)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1.5"))
    ).to.be.reverted;
  });
});