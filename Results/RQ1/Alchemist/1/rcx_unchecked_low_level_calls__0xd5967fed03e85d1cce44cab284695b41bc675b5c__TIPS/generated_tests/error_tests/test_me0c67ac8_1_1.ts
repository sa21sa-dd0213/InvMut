import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6)", function () {
  it("should return true on successful transfer call", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple mock token contract to receive the call
    const mockTokenFactory = await ethers.getContractFactory("MockToken");
    const mockToken = await mockTokenFactory.deploy();
    await mockToken.waitForDeployment();

    const recipients = [addr1.address, addr2.address];
    const value = ethers.parseEther("1");

    // Call transfer and expect it to return true
    const tx = await instance.transfer(owner.address, await mockToken.getAddress(), recipients, value);
    const receipt = await tx.wait();

    // Verify the transaction succeeded and returned true
    expect(receipt?.status).to.equal(1);
  });
});

// Simple mock token contract to allow transferFrom calls to succeed
contract MockToken {
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        return true;
    }
}