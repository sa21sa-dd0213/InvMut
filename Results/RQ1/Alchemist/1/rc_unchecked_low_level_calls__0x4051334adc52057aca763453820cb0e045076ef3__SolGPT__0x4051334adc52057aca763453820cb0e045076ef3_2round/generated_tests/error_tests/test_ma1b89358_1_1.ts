import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant test - require(_s) removal", function () {
  it("should revert when external call to transferFrom fails (mutant silently returns true)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the airdrop contract (no constructor arguments)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();

    // Deploy a simple ERC20 token that does NOT implement transferFrom
    // We'll use a minimal contract that reverts on any call
    const MaliciousFactory = await ethers.getContractFactory(
      "contract MaliciousToken { function transferFrom(address, address, uint256) public pure returns (bool) { revert(); } }"
    );
    const maliciousToken = await MaliciousFactory.deploy();
    await maliciousToken.waitForDeployment();

    // Prepare test data: send tokens from owner to addr1 (addr1 is not the owner of tokens)
    // The call should fail because MaliciousToken.transferFrom will revert
    const recipients = [addr2.address];
    const amount = ethers.parseEther("10");

    // Expect the transaction to revert on the original (but mutant will return true)
    await expect(
      airdrop.transfer(owner.address, maliciousToken.target, recipients, amount)
    ).to.be.reverted;
  });
});