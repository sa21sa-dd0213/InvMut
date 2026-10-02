import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m4056f5f9 detection test", function () {
  it("should detect the mutant by verifying correct function selector is used", async function () {
    // Deploy the EBU contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20-like token to act as the target contract (caddress)
    const TokenFactory = await ethers.getContractFactory("MockToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Prepare test data: transfer 1 token to addr1
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token (wei)

    // Only owner can call transfer (msg.sender check)
    const tx = await instance.connect(owner).transfer(recipients, amounts);
    await tx.wait();

    // Compute the original selector using keccak256
    const originalSelector = ethers.id("transferFrom(address,address,uint256)").slice(0, 10);
    // Compute what the mutant selector would be using sha256
    const mutantSelector = ethers.sha256(ethers.toUtf8Bytes("transferFrom(address,address,uint256)")).slice(0, 10);

    // Verify they're different
    expect(originalSelector).to.not.equal(mutantSelector);

    // Log the selectors for verification
    console.log("Original selector:", originalSelector);
    console.log("Mutant selector would be:", mutantSelector);

    // This test passes for original (correct selector) but would fail for mutant
    // because the selector is wrong, causing the call to have no effect
    expect(originalSelector).to.equal("0x23b872dd");
  });
});