import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop reference (ethers v6)", function () {
  it("should revert when _tos array is empty in transfer function (kill mutant md6a16191)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as the caddress parameter
    const TokenFactory = await ethers.getContractFactory("MockToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Prepare parameters: empty _tos array, any v and _decimals
    const from = addr1.address;
    const caddress = await token.getAddress();
    const emptyTos: string[] = [];
    const v = 100;
    const _decimals = 0;

    // The original contract reverts with require(_tos.length > 0);
    // The mutant removes this require, so it will not revert
    await expect(
      instance.transfer(from, caddress, emptyTos, v, _decimals)
    ).to.be.reverted;
  });
});

// Minimal mock token contract for testing
contract MockToken {
    function transferFrom(address, address, uint256) external pure returns (bool) {
        return true;
    }
}