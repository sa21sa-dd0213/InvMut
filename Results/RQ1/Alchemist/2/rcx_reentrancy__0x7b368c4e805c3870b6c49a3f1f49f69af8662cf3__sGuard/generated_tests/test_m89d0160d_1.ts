import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m89d0160d detection", function () {
  it("should detect the mutant by verifying balance deduction and log entry after successful Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    const walletAddress = await walletInstance.getAddress();
    
    // Put funds into wallet with unlock time in the past
    const depositAmount = ethers.parseEther("2");
    const unlockTime = 0; // Already unlocked
    
    await walletInstance.connect(addr1).Put(unlockTime, { value: depositAmount });
    
    // Verify initial balance
    let holder = await walletInstance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Collect 1 ether
    const collectAmount = ethers.parseEther("1");
    const tx = await walletInstance.connect(addr1).Collect(collectAmount);
    await tx.wait();
    
    // Check that balance was deducted (original behavior) vs not deducted (mutant behavior)
    holder = await walletInstance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount - collectAmount);
    
    // Check that a log entry was created
    const logCount = await logInstance.connect(owner).History.length;
    expect(logCount).to.equal(1); // One from Put, one from Collect
    
    // Verify the last log entry (from Collect)
    const lastMessage = await logInstance.connect(owner).History(logCount - BigInt(1));
    expect(lastMessage.Sender).to.equal(addr1.address);
    expect(lastMessage.Val).to.equal(collectAmount);
    expect(lastMessage.Data).to.equal("Collect");
  });
});