import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m0c4573f7 - empty _tos array", function () {
  it("should revert when _tos array is empty (original behavior), but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant removes the require(_tos.length > 0) check
    // So calling transfer with an empty _tos array should NOT revert in the mutant
    // In the original contract, this would revert
    // We expect the call to revert, which would kill the mutant (fail the test)
    const emptyTos: string[] = [];
    await expect(
      instance.transfer(owner.address, addr1.address, emptyTos, 100)
    ).to.be.reverted;
  });
});