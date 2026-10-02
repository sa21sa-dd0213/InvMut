import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant mf0173f24 test", function () {
  it("should revert when _tos array is empty (mutant missing require check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant removes the require(_tos.length > 0) check.
    // Calling transfer with an empty _tos array should revert in the original
    // but succeed (return true) in the mutant. We expect revert to kill the mutant.
    await expect(
      instance.transfer(
        owner.address,
        addr1.address, // caddress - any contract address, will fail on call but mutant skips length check
        [],           // empty _tos array
        100
      )
    ).to.be.reverted;
  });
});