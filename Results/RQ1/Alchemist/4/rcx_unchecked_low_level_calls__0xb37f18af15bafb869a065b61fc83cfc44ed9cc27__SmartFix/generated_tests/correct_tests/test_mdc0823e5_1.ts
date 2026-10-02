import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mdc0823e5: owner calling onlyOwner function succeeds in original, reverts in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so withdrawAll has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // The owner should be able to call withdrawAll successfully in the original contract
    // In the mutant, the onlyOwner modifier uses != instead of ==, so the owner will be reverted
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});