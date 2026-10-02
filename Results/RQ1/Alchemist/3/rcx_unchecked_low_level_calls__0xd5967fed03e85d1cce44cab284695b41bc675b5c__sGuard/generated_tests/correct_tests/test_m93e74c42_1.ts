import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m93e74c42 test", function () {
  it("should revert when _tos array is empty (detect mutant changing > to >=)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test with empty _tos array - original requires length > 0, mutant allows length >= 0
    const emptyAddresses: string[] = [];
    
    // Call transfer with empty array - should revert in original, pass in mutant
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});