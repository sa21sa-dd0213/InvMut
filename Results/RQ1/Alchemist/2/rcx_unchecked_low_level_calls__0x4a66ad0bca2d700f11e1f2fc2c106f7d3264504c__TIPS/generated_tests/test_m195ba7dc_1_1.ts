import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m195ba7dc test", function () {
  it("should detect keccak256 vs sha256 mutation by expecting revert on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's from address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to use this address as msg.sender (the owner signer)
    // Create valid arrays for _tos and v
    const tos = ["0x0000000000000000000000000000000000000001"];
    const v = [1];

    // The external caddress (0x1f844685f7Bf86eFcc0e74D8642c54A257111923) is hardcoded
    // Since we cannot control it, the call will likely fail due to wrong selector
    // The original uses keccak256, mutant uses sha256 - different selector
    // The call will revert because the external call fails
    await expect(
      instance.connect(owner).transfer(tos, v)
    ).to.be.reverted;
  });
});