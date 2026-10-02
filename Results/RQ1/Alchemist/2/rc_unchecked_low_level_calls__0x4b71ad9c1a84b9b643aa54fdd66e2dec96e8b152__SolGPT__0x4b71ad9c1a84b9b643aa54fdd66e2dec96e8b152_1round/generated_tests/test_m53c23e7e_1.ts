import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m53c23e7e test", function () {
  it("should revert when _tos array is empty (original behavior), but mutant allows it to pass", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyArray: string[] = [];
    const amount = ethers.parseEther("1");

    // This call should revert on the original contract (require(_tos.length > 0))
    // but will succeed on the mutant (require(_tos.length >= 0) is always true)
    await expect(
      instance.transfer(owner.address, addr1.address, emptyArray, amount)
    ).to.be.reverted;
  });
});