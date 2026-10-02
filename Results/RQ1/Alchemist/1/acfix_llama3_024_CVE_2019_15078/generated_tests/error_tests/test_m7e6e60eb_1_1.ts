import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m7e6e60eb - transferFrom payload size check", function () {
  it("should revert on original contract with small calldata but succeed on mutant with relaxed size check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for XBORNID)
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, give owner some tokens by calling getTokens (which distributes via distr)
    // Owner needs to not be blacklisted initially
    await instance.connect(owner).getTokens({ value: 0 });

    // Now approve addr1 to spend tokens on behalf of owner
    const approveAmount = ethers.parseEther("1000");
    await instance.connect(owner).approve(addr1.address, approveAmount);

    // Craft a minimal calldata for transferFrom that is smaller than 96 bytes
    // The function selector for transferFrom(address,address,uint256) is 0x23b872dd
    // We'll only provide the 4-byte selector + 32 bytes (one argument) = 36 bytes total
    // This is > 3+32=35 but < 3*32=96, so it should pass mutant but fail original
    const iface = new ethers.Interface(["function transferFrom(address,address,uint256)"]);
    const partialCalldata = iface.encodeFunctionData("transferFrom", [
      owner.address,
      addr2.address,
      ethers.parseEther("100")
    ]).slice(0, 74); // Take only 4 bytes selector + 32 bytes (first argument) = 36 bytes hex = 72 chars + 0x = 74 chars

    // Send transaction with the truncated calldata
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      data: partialCalldata
    });

    // The transaction should succeed (not revert) because the mutant allows 35+ bytes
    await expect(tx).to.not.be.reverted;

    // Verify that the balance was NOT actually transferred (since calldata was incomplete)
    const balanceBefore = await instance.balanceOf(addr2.address);
    expect(balanceBefore).to.equal(0);
  });
});