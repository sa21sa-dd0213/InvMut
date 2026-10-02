import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6)", function () {
  it("should revert when non-owner calls withdrawAll (detect mutant removing onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so there's something to withdraw
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Attempt to call withdrawAll from non-owner address
    const instanceAsNonOwner = instance.connect(addr1);
    
    // The original contract would revert because of onlyOwner modifier
    // The mutant would allow the call and drain the contract
    await expect(instanceAsNonOwner.withdrawAll()).to.be.reverted;
  });
});