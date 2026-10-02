import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - Mutant m8dd31b0d test", function () {
  it("should revert when assertGovernanceApproved is called with insufficient token balance (transferFrom fails)", async function () {
    const [owner, sender, target] = await ethers.getSigners();

    // Deploy mock ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const token = await ERC20Factory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Deploy mock LimboDAO
    const LimboDAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const dao = await LimboDAOFactory.deploy();
    await dao.waitForDeployment();

    // Deploy FlashGovernanceArbiter
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await Factory.deploy(await dao.getAddress());
    await arbiter.waitForDeployment();

    // Configure flash governance with asset and amount
    await arbiter.connect(owner).configureFlashGovernance(
      await token.getAddress(),
      ethers.parseEther("100"),
      3600, // unlockTime
      false // assetBurnable
    );

    // Make sender a governed address via DAO
    await arbiter.connect(owner).setDAO(await dao.getAddress());
    await dao.setSuccessfulProposal(owner.address, true);
    await arbiter.connect(owner).setGoverned(
      [await sender.getAddress()],
      [true]
    );

    // Sender has no tokens - transferFrom should fail
    // Call assertGovernanceApproved and expect revert
    await expect(
      arbiter.connect(sender).assertGovernanceApproved(
        await sender.getAddress(),
        await target.getAddress(),
        false
      )
    ).to.be.revertedWith("LIMBO: governance decision rejected.");
  });
});

// Mock contracts needed for testing
// Note: In a real test environment, these would be separate files
contract MockERC20 {
    string public name;
    string public symbol;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint256 _totalSupply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = _totalSupply;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount);
        require(allowance[from][msg.sender] >= amount);
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

contract MockLimboDAO {
    address public flashGoverner;
    mapping(address => bool) public successfulProposal;
    mapping(address => bool) public approvedMinters;

    function setFlashGoverner(address _governer) external {
        flashGoverner = _governer;
    }

    function setSuccessfulProposal(address proposal, bool success) external {
        successfulProposal[proposal] = success;
    }

    function getFlashGoverner() external view returns (address) {
        return flashGoverner;
    }

    function proposalConfig() external view returns (uint256, uint256, address) {
        return (0, 0, address(0));
    }
}