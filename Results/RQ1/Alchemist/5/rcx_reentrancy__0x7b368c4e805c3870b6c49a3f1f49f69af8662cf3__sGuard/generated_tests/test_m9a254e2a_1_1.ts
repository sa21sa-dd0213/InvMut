import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m9a254e2a test", function () {
  it("should revert when trying to collect more than balance before unlock time (original) but succeed in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Send 0.5 ether (below MinSum of 1 ether) to the contract via Put
    const putTx = await instance.connect(addr1).Put(
      Math.floor(Date.now() / 1000) + 1000, // unlock time in the future
      { value: ethers.parseEther("0.5") }
    );
    await putTx.wait();

    // Try to collect 0.3 ether immediately (before unlock time and balance below MinSum)
    // Original should revert; mutant will succeed
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.3"))
    ).to.be.reverted;
  });
});