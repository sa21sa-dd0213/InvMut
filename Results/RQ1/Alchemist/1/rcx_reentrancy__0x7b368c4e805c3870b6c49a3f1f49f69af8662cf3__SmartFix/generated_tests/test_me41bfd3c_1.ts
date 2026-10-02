import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant me41bfd3c", function () {
  it("should kill the mutant by withdrawing less than full balance when balance > amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();
    
    const walletAddress = await wallet.getAddress();
    
    // Deposit 2 ether from addr1 (balance will be 2 ether)
    const depositAmount = ethers.parseEther("2");
    await wallet.connect(addr1).Put(0, { value: depositAmount });
    
    // Verify balance is 2 ether
    const holder = await wallet.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Attempt to withdraw only 1 ether (less than full balance)
    const withdrawAmount = ethers.parseEther("1");
    
    // On original contract this succeeds (2 >= 1), on mutant it reverts (2 != 1)
    await expect(
      wallet.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});