import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - Put function msg.value-1", function () {
  it("should detect mutant that subtracts 1 wei from msg.value in Put", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Send exactly 1 wei to Put function
    const tx = await instance.connect(user).Put(0, { value: ethers.parseEther("0.000000000000000001") });
    await tx.wait();
    
    // Check recorded balance - should be 1 wei in original, but 0 wei in mutant
    const holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(ethers.parseEther("0.000000000000000001"));
  });
});