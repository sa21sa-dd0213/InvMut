import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection - constructor sets owner to address(0)", function () {
  it("should detect that constructor does not set owner to the deployer address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Verify the owner was set correctly (original behavior)
    const storedOwner = await instance.owner();
    expect(storedOwner).to.equal(owner.address);

    // Attempt to withdrawAll as the intended owner - should succeed in original
    // but fail in mutant because owner is address(0)
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.not.be.reverted;

    // Additionally, verify that the actual owner (address(0) in mutant) cannot be used
    // This confirms the mutation is present
    const zeroAddress = ethers.ZeroAddress;
    await expect(
      instance.connect(await ethers.getImpersonatedSigner(zeroAddress)).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});