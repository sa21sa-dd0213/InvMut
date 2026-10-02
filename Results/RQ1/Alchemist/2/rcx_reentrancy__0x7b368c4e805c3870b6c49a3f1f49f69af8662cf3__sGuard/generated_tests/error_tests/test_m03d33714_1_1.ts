import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m03d33714 test", function () {
  it("should kill the mutant by testing Collect with balance > _am", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Fund addr1 with 2 ether via Put
    const putTx = await instance.connect(addr1).Put(0, { value: ethers.parseEther("2") });
    await putTx.wait();

    // Verify balance is 2 ether
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(ethers.parseEther("2"));

    // Attempt to Collect 1 ether - should succeed on original but fail on mutant
    const collectTx = instance.connect(addr1).Collect(ethers.parseEther("1"));

    // On the mutant, this will revert because balance (2) <= _am (1) is false
    // On original, it succeeds because balance (2) >= _am (1) is true
    await expect(collectTx).to.be.reverted;
  });
});