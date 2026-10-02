import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant md8e8d016 detection", function () {
  it("should detect mutant that adds 1 extra wei to balance on Put", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Send exactly 1 wei via Put function
    const tx = await wallet.connect(user).Put(0, { value: 1 });
    await tx.wait();
    
    // Check recorded balance - should be 1 wei in original, 2 wei in mutant
    const balance = await wallet.Acc(user.address);
    expect(balance.balance).to.equal(1);
    
    // Try to collect exactly 1 wei - should succeed in original, fail in mutant
    // because mutant records 2 wei but only 1 wei is available to send
    await expect(
      wallet.connect(user).Collect(1)
    ).to.not.be.reverted;
    
    // Verify balance after collection
    const balanceAfter = await wallet.Acc(user.address);
    expect(balanceAfter.balance).to.equal(0);
    
    // Additional check: the contract's actual ether balance should match
    const contractBalance = await ethers.provider.getBalance(await wallet.getAddress());
    expect(contractBalance).to.equal(0);
  });
});