import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney is called with a failing target address (mutant kills revert check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy SimpleWallet (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple contract that always reverts when receiving ETH
    const RevertingContract = await ethers.getContractFactory("RevertingContract");
    const revertingInstance = await RevertingContract.deploy();
    await revertingInstance.waitForDeployment();
    
    // Fund the wallet with some ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attempt to send ETH to the reverting contract - should revert in original
    const targetAddress = await revertingInstance.getAddress();
    const data = "0x";
    
    await expect(
      instance.connect(owner).sendMoney(targetAddress, ethers.parseEther("0.5"), data)
    ).to.be.reverted;
  });
});