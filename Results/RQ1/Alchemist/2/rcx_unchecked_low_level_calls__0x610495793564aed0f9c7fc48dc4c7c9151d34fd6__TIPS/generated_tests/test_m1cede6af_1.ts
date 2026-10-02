import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney fails on original, but passes on mutant that removed revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy SimpleWallet - no constructor arguments needed
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a contract that will reject incoming ether (revert in receive)
    const RejectorFactory = await ethers.getContractFactory("contract Rejector { receive() external payable { revert(); } }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Fund the wallet with some ether for the test
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attempt to send ether to the rejecting contract - should revert on original
    await expect(
      instance.connect(owner).sendMoney(
        await rejector.getAddress(),
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.reverted;
  });
});