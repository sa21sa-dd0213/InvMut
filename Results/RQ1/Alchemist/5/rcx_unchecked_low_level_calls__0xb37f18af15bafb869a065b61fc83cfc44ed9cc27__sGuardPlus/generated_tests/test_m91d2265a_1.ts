import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney sends Ether to a non-payable contract that reverts on receive", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy SimpleWallet (no constructor arguments)
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple contract that reverts on receive
    const RevertingReceiver = await ethers.getContractFactory("contracts/RevertingReceiver.sol:RevertingReceiver");
    const receiver = await RevertingReceiver.deploy();
    await receiver.waitForDeployment();
    
    // Send 1 ether to the wallet first to have balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attempt to send Ether to the reverting contract - should revert on original, pass on mutant
    await expect(
      instance.connect(owner).sendMoney(await receiver.getAddress(), ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});