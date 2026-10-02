import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection", function () {
  it("should kill mutant m05573959 by calling onlyOwner function from owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether for withdrawal test
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Call withdrawAll from owner - should succeed in original but revert in mutant
    const tx = instance.connect(owner).withdrawAll();
    await expect(tx).to.not.be.reverted;
  });
});