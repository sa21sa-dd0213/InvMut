import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m0a74e36f test", function () {
  it("should revert when Put is called with non-zero msg.value (mutant uses subtraction instead of addition)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Send 1 wei to the Put function - this should revert on the mutant
    // because (balance - msg.value) >= balance is false when msg.value > 0
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    await expect(tx).to.be.reverted;
  });
});