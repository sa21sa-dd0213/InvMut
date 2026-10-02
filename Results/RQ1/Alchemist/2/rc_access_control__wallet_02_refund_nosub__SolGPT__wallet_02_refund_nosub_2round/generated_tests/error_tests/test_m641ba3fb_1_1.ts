import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-creator calls migrateTo (kill mutant m641ba3fb)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether for the test
    const depositAmount = ethers.parseEther("10");
    await instance.connect(owner).deposit({ value: depositAmount });

    // Attempt to call migrateTo from a non-creator address (addr1)
    // The original contract should revert; the mutant will allow it
    await expect(
      instance.connect(addr1).migrateTo(addr2.address)
    ).to.be.reverted;
  });
});