import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET - kill mutant m0d55ce44 (>= replaced with >)", function () {
  it("should allow Collect when balance equals MinSum (1 ether) - mutant fails with strict >", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with Log address as constructor argument
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const walletInstance = await XWalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    // Verify MinSum is 1 ether
    expect(await walletInstance.MinSum()).to.equal(ethers.parseEther("1"));
    
    // Put exactly 1 ether into the contract (balance == MinSum)
    const putTx = await walletInstance.connect(addr1).Put(0, { value: ethers.parseEther("1") });
    await putTx.wait();
    
    // Check that balance equals MinSum
    const holder = await walletInstance.Acc(addr1.address);
    expect(holder.balance).to.equal(ethers.parseEther("1"));
    
    // Attempt to collect the full 1 ether balance
    // Original: acc.balance >= MinSum (1 >= 1 is true) - should succeed
    // Mutant: acc.balance > MinSum (1 > 1 is false) - should revert
    await expect(
      walletInstance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.not.be.reverted;
  });
});