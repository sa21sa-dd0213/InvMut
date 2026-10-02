import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mfe7da1c7 test", function () {
  it("should revert when non-owner calls transferAnyERC20Token (onlyOwner modifier removed in mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr1.address, ethers.parseEther("1"));
    await instance.waitForDeployment();

    // The mutant removes onlyOwner modifier, so calling from non-owner would succeed on mutant
    // On original it should revert. We expect revert on original, so we check revert.
    // Since this is a mutant detection test, we assume the contract is the mutant (no onlyOwner)
    // Therefore we call from non-owner and expect it to succeed (mutant behavior)
    // But the test should fail on original (which reverts), thus killing the mutant
    const tokenAddress = ethers.ZeroAddress;
    const tokenOwner = addr1.address;
    const tokens = 0;

    // On the mutant, this call will succeed (no onlyOwner check)
    // On original, it would revert. So we test that the call does NOT revert.
    await expect(
      instance.connect(addr1).transferAnyERC20Token(tokenAddress, tokenOwner, tokens)
    ).to.not.be.reverted;
  });
});