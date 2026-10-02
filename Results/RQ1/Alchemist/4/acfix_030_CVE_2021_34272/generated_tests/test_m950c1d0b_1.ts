import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when owner calls a protected function (mutant incorrectly blocks owner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner is the deployer (address zero in this contract), 
    // so we need to transfer ownership to a real address first
    // The contract has no constructor that sets owner, so owner defaults to address(0)
    // We call transferOwnership from address(0) (owner) to set a real owner
    // But since address(0) can't send transactions, we use the actual deployer
    // Actually, the contract's owner starts as address(0) so we can call transferOwnership
    // from any address because onlyOwner uses ==, but the mutant uses !=
    // For the mutant: owner == address(0), so anyone != address(0) passes the check
    // To kill the mutant, we need to show that when owner calls a function, it reverts
    // But we can't call from address(0). Instead we first transfer ownership to addr1
    // then from addr1 (now owner) call a protected function - mutant will revert
    
    // Transfer ownership from current owner (address(0)) - but we can't call from address(0)
    // Actually the contract as written has no constructor, so owner is address(0)
    // In the original, require(msg.sender == owner) means address(0) is the only caller
    // But in tests we can impersonate address(0) using hardhat
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x0000000000000000000000000000000000000000"],
    });
    const zeroSigner = await ethers.getSigner("0x0000000000000000000000000000000000000000");
    await instance.connect(zeroSigner).transferOwnership(addr1.address);
    
    // Now addr1 is the owner. Call transferOwnership from addr1 - should succeed on original
    // but on mutant it will revert because msg.sender (addr1) != owner (addr1) is false
    await expect(
      instance.connect(addr1).transferOwnership(addr2.address)
    ).to.be.reverted;
  });
});