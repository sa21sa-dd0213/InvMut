import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - state variable change", function () {
  it("should detect that from address was mutated from owner to contract address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const instanceAddress = await instance.getAddress();

    // Get the mutated from address (which should be the contract address)
    const mutatedFrom = await instance.from();

    // Verify that the from address is NOT the owner (which it should be in original)
    // In the mutant, from is set to 0x1f844685f7Bf86eFcc0e74D8642c54A257111923 (contract address)
    // In original, from is set to owner address (0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9)

    // The test: call transfer from the owner address with a valid recipient and amount
    const toAddresses = [addr1.address];
    const amounts = [1]; // 1 token (will be multiplied by 1e18)

    // This should work in the original, but in the mutant the from address is wrong
    // The mutant will try to transferFrom contract address instead of owner
    await expect(
      instance.connect(owner).transfer(toAddresses, amounts)
    ).to.not.be.reverted;

    // Check that the from address is the original owner, not the contract
    // If from equals the contract address (mutant), this assertion fails
    expect(mutatedFrom).to.equal("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
  });
});