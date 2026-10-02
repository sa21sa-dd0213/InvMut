import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mc77b4289 test", function () {
  it("should detect mutant that changes >= to == in Put function require", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    // Test: send a positive value (1 ether) to Put - should succeed in original but revert in mutant
    const tx = walletInstance.connect(owner).Put(0, { value: ethers.parseEther("1") });
    
    // In original: require((balance + 1 ether) >= balance) passes
    // In mutant: require((balance + 1 ether) == balance) fails because 1 ether != 0
    // So the mutant should revert, killing the test
    await expect(tx).to.not.be.reverted;
    
    // Verify balance was updated (only possible if Put succeeded)
    const holder = await walletInstance.Acc(owner.address);
    expect(holder.balance).to.equal(ethers.parseEther("1"));
  });
});