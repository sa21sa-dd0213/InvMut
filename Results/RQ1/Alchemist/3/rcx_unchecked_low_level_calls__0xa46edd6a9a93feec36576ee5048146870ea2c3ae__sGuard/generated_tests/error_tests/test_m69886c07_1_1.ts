import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m69886c07 detection", function () {
  it("should detect mutation of keccak256 to sha256 by verifying correct function selector is called", async function () {
    // Deploy the EBU contract (no constructor arguments)
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const ebu = await Factory.deploy();
    await ebu.waitForDeployment();

    // Deploy a simple ERC20-like contract that logs which function selector was called
    const MockTokenFactory = await ethers.getContractFactory(
      "contracts/MockToken.sol:MockToken"
    );
    const mockToken = await MockTokenFactory.deploy();
    await mockToken.waitForDeployment();

    // Prepare test data: transfer 100 tokens from addr1 to addr2
    const tos = [addr2.address];
    const values = [ethers.parseEther("100")];

    // Call the transfer function on EBU
    const tx = await ebu
      .connect(owner)
      .transfer(addr1.address, await mockToken.getAddress(), tos, values);
    await tx.wait();

    // Check that the MockToken received the correct function selector
    // The original uses keccak256("transferFrom(address,address,uint256)") -> selector 0x23b872dd
    // The mutant uses sha256(...) which produces a different selector
    const lastSelector = await mockToken.lastSelector();

    // The correct selector for transferFrom is 0x23b872dd
    // If the mutant was applied, the selector will be different
    expect(lastSelector).to.equal("0x23b872dd");
  });
});