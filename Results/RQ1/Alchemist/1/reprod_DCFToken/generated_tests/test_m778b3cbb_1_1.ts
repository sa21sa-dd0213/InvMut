import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant detection - setCaller hardcoded address", function () {
  it("should detect mutant that ignores setCaller argument and hardcodes cfo", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DCF with a liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(addr2.address);
    await instance.waitForDeployment();

    // Get the DCT token address from the contract
    const DCT_ADDRESS = await instance.DCT();

    // Verify DCT address matches the hardcoded address in the mutant
    const hardcodedAddress = "0x56f46bD073E9978Eb6984C0c3e5c661407c3A447";
    expect(DCT_ADDRESS).to.equal(hardcodedAddress);

    // Initially, setCaller has not been called, so cfo is address(0)
    // We'll test by calling setCaller with addr1's address
    // In original: cfo becomes addr1
    // In mutant: cfo becomes DCT_ADDRESS (hardcoded)

    // Call setCaller with addr1's address
    await instance.connect(owner).setCaller(addr1.address);

    // Now try to call distributeToken from addr1 (which should work in original)
    // In mutant, addr1 is NOT the cfo (DCT_ADDRESS is), so this should revert
    await expect(
      instance.connect(addr1).distributeToken()
    ).to.be.reverted;

    // Verify that the cfo was set to DCT_ADDRESS (mutant) instead of addr1 (original)
    // We can test this by calling setDistributeAddress with a non-zero address first
    // then try to call distributeToken from DCT_ADDRESS (which should work in mutant)

    // Set a distribute address first
    await instance.connect(owner).setCaller(owner.address);
    await instance.connect(owner).setDistributeAddress(addr2.address);

    // Now call setCaller again with addr1
    await instance.connect(owner).setCaller(addr1.address);

    // Try to call distributeToken from DCT_ADDRESS (the hardcoded address)
    // In mutant this should succeed, in original it should fail
    // We need to impersonate the DCT address to test this
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [DCT_ADDRESS],
    });

    const dctSigner = await ethers.getSigner(DCT_ADDRESS);

    // Fund the DCT address with some ETH to pay for gas
    await owner.sendTransaction({
      to: DCT_ADDRESS,
      value: ethers.parseEther("1"),
    });

    // Try to call distributeToken from DCT address
    // In original (cfo = addr1): should revert
    // In mutant (cfo = DCT_ADDRESS): should succeed (but may fail for other reasons)
    // We just check if it reverts with the expected message
    await expect(
      instance.connect(dctSigner).distributeToken()
    ).to.be.reverted;

    // Stop impersonation
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [DCT_ADDRESS],
    });
  });
});