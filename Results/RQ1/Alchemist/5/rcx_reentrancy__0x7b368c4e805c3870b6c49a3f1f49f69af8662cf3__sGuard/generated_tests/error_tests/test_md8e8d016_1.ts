import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - md8e8d016", function () {
  it("should detect mutant by sending exact Ether and withdrawing same amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Send exactly 1 ether via Put from addr1
    const sendAmount = ethers.parseEther("1.0");
    const tx = await instance.connect(addr1).Put(0, { value: sendAmount });
    await tx.wait();
    
    // Check recorded balance for addr1
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(sendAmount); // This will fail on mutant since balance = sendAmount + 1 wei
    
    // Try to withdraw exactly 1 ether (should succeed on original)
    const collectTx = instance.connect(addr1).Collect(sendAmount);
    await expect(collectTx).to.not.be.reverted;
    
    // After withdrawal, balance should be 0 on original
    const holderAfter = await instance.Acc(addr1.address);
    expect(holderAfter.balance).to.equal(0); // On mutant, 1 wei will remain
  });
});