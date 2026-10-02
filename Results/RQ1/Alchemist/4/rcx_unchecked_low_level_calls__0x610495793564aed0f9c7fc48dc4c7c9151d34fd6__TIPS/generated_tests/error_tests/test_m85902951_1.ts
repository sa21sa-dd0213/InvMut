import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - onlyOwner modifier", function () {
  it("should revert when owner calls withdrawAll with inverted modifier (msg.sender != owner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH so withdrawAll can be called
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Owner should be able to call withdrawAll in original contract
    // In the mutant, this should revert because require(msg.sender != owner) fails for owner
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.be.reverted;
  });
});