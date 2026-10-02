import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant test", function () {
  it("should kill mutant m9dd7fe1f by calling multiplicate with msg.value = 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first so balance > 0
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Call multiplicate with msg.value = 0
    // Original: should succeed (require passes)
    // Mutant: will revert because (balance + 0 - 1) < balance
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: 0 })
    ).to.not.be.reverted;
  });
});