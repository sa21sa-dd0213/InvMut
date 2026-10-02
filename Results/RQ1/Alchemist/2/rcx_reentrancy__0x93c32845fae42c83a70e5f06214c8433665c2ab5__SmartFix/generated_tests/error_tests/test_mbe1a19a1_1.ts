import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET - kill mutant mbe1a19a1", function () {
  it("should kill the mutant by sending non-zero ether to Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with Log address as constructor argument
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const xWalletInstance = await XWalletFactory.deploy(await logInstance.getAddress());
    await xWalletInstance.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1.0");
    
    // This transaction should succeed on original contract (balance increases)
    // but fail on mutant due to the <= check (require((balance + msg.value) <= balance))
    const tx = await xWalletInstance.connect(addr1).Put(
      0, // _unlockTime = 0
      { value: depositAmount }
    );
    
    // Wait for the transaction to be mined
    await tx.wait();
    
    // Verify the deposit was successful by checking the balance
    const holder = await xWalletInstance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
  });
});