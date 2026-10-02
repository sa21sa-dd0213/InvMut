import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - m9b11bc4b", function () {
  it("should detect the division mutant by verifying correct balance subtraction", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with the Log address as constructor argument
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await XWalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();
    
    // Deposit 2 ether from addr1 using Put function
    const depositAmount = ethers.parseEther("2");
    await wallet.connect(addr1).Put(0, { value: depositAmount });
    
    // Verify initial balance is 2 ether
    const holderBefore = await wallet.Acc(addr1.address);
    expect(holderBefore.balance).to.equal(depositAmount);
    
    // Now call Collect to withdraw the full balance
    await wallet.connect(addr1).Collect(depositAmount);
    
    // Check the balance after withdrawal
    // In the original contract: 2 - 2 = 0
    // In the mutant: 2 / 2 = 1 (which would fail this assertion)
    const holderAfter = await wallet.Acc(addr1.address);
    expect(holderAfter.balance).to.equal(0);
  });
});