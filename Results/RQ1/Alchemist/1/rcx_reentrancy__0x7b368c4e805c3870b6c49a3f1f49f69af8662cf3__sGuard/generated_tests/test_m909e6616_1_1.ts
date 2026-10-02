import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET - mutant m909e6616 detection", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Call Put with exactly 1 ether
    const tx = await instance.connect(addr1).Put(
      Math.floor(Date.now() / 1000) + 1000, // future unlock time
      { value: ethers.parseEther("1") }
    );
    await tx.wait();

    // Get the last message from Log's History
    const history = await log.History(0);
    const loggedVal = history.Val;

    // Assert that logged value equals exactly 1 ether (not 1 ether + 1 wei)
    expect(loggedVal).to.equal(ethers.parseEther("1"));
  });
});