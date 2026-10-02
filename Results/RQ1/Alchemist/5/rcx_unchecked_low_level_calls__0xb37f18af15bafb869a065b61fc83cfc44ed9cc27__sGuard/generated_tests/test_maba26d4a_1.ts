import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant maba26d4a - onlyOwner modifier removed", function () {
  it("should revert when unauthorized address calls withdrawAll", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed as per original code)
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ETH so withdrawAll has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attempt to call withdrawAll from unauthorized address
    // Original should revert, mutant should succeed (and thus fail the test)
    await expect(
      instance.connect(unauthorized).withdrawAll()
    ).to.be.reverted;
  });
});